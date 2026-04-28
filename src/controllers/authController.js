import prisma from "../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { authenticate } from "../utils/auth.js";

function isMissingIsActiveColumnError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("user.isActive") ||
    msg.includes("Unknown column 'isActive'") ||
    (msg.includes("isActive") && msg.includes("does not exist"))
  );
}

async function writeAudit(userId, action, details) {
  try {
    await prisma.auditlog.create({
      data: {
        userId: userId || null,
        action: String(action || "AUTH_EVENT"),
        details:
          typeof details === "string"
            ? details
            : JSON.stringify(details || {}),
      },
    });
  } catch (_) {
    // لا نمنع تسجيل الدخول/التسجيل إذا فشل حفظ السجل
  }
}

async function buildTokenForUser(user) {
  let permissions = {};
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT `permissions` FROM `user` WHERE `id` = ? LIMIT 1",
      user.id,
    );
    const raw = Array.isArray(rows) && rows[0] ? rows[0].permissions : null;
    if (raw) permissions = typeof raw === "object" ? raw : JSON.parse(String(raw));
  } catch (_) {
    permissions = {};
  }
  const vendor = await prisma.vendor.findFirst({
    where: { userId: user.id },
    select: { isApproved: true },
  });
  const canBuyWholesale =
    user.role === "vendor" ||
    user.role === "designer" ||
    Boolean(vendor?.isApproved);
  return jwt.sign(
    { id: user.id, role: user.role, canBuyWholesale, permissions },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Register a new client account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ahmed Ali"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahmed@example.com"
 *               phone:
 *                 type: string
 *                 description: "8-15 digits, optional leading +"
 *                 example: "+201001234567"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "P@ssw0rd123"
 *             additionalProperties: false
 *           example:
 *             name: "Ahmed Ali"
 *             email: "ahmed@example.com"
 *             phone: "+201001234567"
 *             password: "P@ssw0rd123"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing fields, invalid email/phone, or user already exists
 *       403:
 *         description: role is not allowed in public signup
 */
export const signup = async (req, res, body) => {
  try {
    const raw = JSON.parse(body);
    const name = raw.name != null ? String(raw.name).trim() : "";
    const email = raw.email != null ? String(raw.email).trim().toLowerCase() : "";
    const phone = raw.phone != null ? String(raw.phone).trim() : "";
    const password = raw.password != null ? String(raw.password) : "";
    const requestedRole = raw.role != null ? String(raw.role).trim().toLowerCase() : "";

    if (!name || !email || !phone || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "جميع الحقول مطلوبة: الاسم، البريد، الجوال، كلمة المرور" }),
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "صيغة البريد الإلكتروني غير صحيحة" }));
    }

    // Accept international/local numbers with optional leading + and 8-15 digits.
    const normalizedPhone = phone.replace(/[\s-]/g, "");
    const phoneRegex = /^\+?\d{8,15}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "صيغة رقم الجوال غير صحيحة" }));
    }
    const phoneValue = normalizedPhone;

    // Public signup must never allow privilege elevation by role injection.
    if (requestedRole && requestedRole !== "user") {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "غير مسموح بتحديد role عند التسجيل العام" }),
      );
    }

    let existingUser;
    try {
      existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone: phoneValue }] },
      });
    } catch (e) {
      if (!isMissingIsActiveColumnError(e)) throw e;
      const rows = await prisma.$queryRawUnsafe(
        "SELECT `id` FROM `user` WHERE `email` = ? OR `phone` = ? LIMIT 1",
        email,
        phoneValue,
      );
      existingUser = Array.isArray(rows) && rows[0] ? rows[0] : null;
    }

    if (existingUser) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "User already exists" }));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    /** تسجيل عام: دائماً عميل (user) لتفادي ترقية الصلاحيات عبر الطلب */
    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone: phoneValue,
          password: hashedPassword,
          role: "user",
          isActive: true,
        },
      });
    } catch (e) {
      if (!isMissingIsActiveColumnError(e)) throw e;
      try {
        user = await prisma.user.create({
          data: {
            name,
            email,
            phone: phoneValue,
            password: hashedPassword,
            role: "user",
          },
        });
      } catch (e2) {
        if (!isMissingIsActiveColumnError(e2)) throw e2;
        const id = randomUUID();
        await prisma.$executeRawUnsafe(
          "INSERT INTO `user` (`id`,`name`,`email`,`phone`,`password`,`role`) VALUES (?,?,?,?,?,?)",
          id,
          name,
          email,
          phoneValue,
          hashedPassword,
          "user",
        );
        const rows = await prisma.$queryRawUnsafe(
          "SELECT `id`,`name`,`email`,`phone`,`role`,`avatarUrl`,`createdAt` FROM `user` WHERE `id` = ? LIMIT 1",
          id,
        );
        user = Array.isArray(rows) && rows[0] ? rows[0] : { id, name, email, phone: phoneValue, role: "user" };
      }
    }

    const token = await buildTokenForUser(user);
    await writeAudit(user.id, "SIGNUP_SUCCESS", {
      email,
      phone: phoneValue,
      role: user.role,
    });
    const { password: _p, ...pub } = user;
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "User created",
        token,
        user: { ...pub, status: pub.isActive !== false, permissions: {} },
      }),
    );
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+201001234567"
 *               password:
 *                 type: string
 *                 example: "P@ssw0rd123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid password
 *       404:
 *         description: User not found
 */
export const login = async (req, res, body) => {
  try {
    const raw = JSON.parse(body);
    const phone = String(raw.phone || "").trim();
    const password = raw.password != null ? String(raw.password) : "";

    if (!phone || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "يرجى إدخال رقم الجوال وكلمة المرور" }),
      );
    }

    let user;
    try {
      user = await prisma.user.findFirst({
        where: { phone },
      });
    } catch (e) {
      if (!isMissingIsActiveColumnError(e)) throw e;
      const rows = await prisma.$queryRawUnsafe(
        "SELECT `id`,`name`,`email`,`phone`,`password`,`role` FROM `user` WHERE `phone` = ? LIMIT 1",
        phone,
      );
      user = Array.isArray(rows) && rows[0] ? rows[0] : null;
    }
    if (!user) {
      await writeAudit(null, "LOGIN_FAILED", {
        reason: "user_not_found",
        identifier: phone,
      });
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "User not found" }));
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await writeAudit(user.id, "LOGIN_FAILED", {
        reason: "invalid_password",
        identifier: phone,
      });
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid password" }));
    }

    if (
      user.isActive === false ||
      user.isActive === 0 ||
      user.isActive === "0"
    ) {
      await writeAudit(user.id, "LOGIN_FAILED", {
        reason: "account_disabled",
        identifier: phone,
      });
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "Account is disabled" }),
      );
    }

    const token = await buildTokenForUser(user);
    await writeAudit(user.id, "LOGIN_SUCCESS", {
      identifier: phone,
      role: user.role,
    });

    const { password: _pw, ...userPublic } = user;
    let permissions = {};
    try {
      const rows = await prisma.$queryRawUnsafe(
        "SELECT `permissions` FROM `user` WHERE `id` = ? LIMIT 1",
        user.id,
      );
      const raw = Array.isArray(rows) && rows[0] ? rows[0].permissions : null;
      if (raw) permissions = typeof raw === "object" ? raw : JSON.parse(String(raw));
    } catch (_) {}

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Login success", token, user: { ...userPublic, permissions } }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

const OTP_TTL_MINUTES = 10;
const makeOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

/**
 * @swagger
 * /auth/forgot-password/otp:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: User phone or email
 *     responses:
 *       200:
 *         description: OTP generated successfully
 *       404:
 *         description: User not found
 */
export const requestPasswordResetOtp = async (req, res, body) => {
  try {
    const raw = JSON.parse(body || "{}");
    const identifier = String(raw.identifier || raw.phone || raw.email || "").trim();
    if (!identifier) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "identifier is required (phone or email)" }));
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier.toLowerCase() }],
      },
      select: { id: true, phone: true, email: true },
    });
    if (!user) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "User not found" }));
    }

    const code = makeOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await prisma.otp.create({
      data: {
        phone: user.phone || user.email,
        code,
        expiresAt,
        used: false,
      },
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "OTP sent successfully",
        identifier: user.phone || user.email,
        expiresAt,
        otp: code, // dev-friendly; replace with SMS provider in production
      }),
    );
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

/**
 * @swagger
 * /auth/forgot-password/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, otp]
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP is valid
 *       400:
 *         description: OTP invalid/expired
 */
export const verifyPasswordResetOtp = async (req, res, body) => {
  try {
    const raw = JSON.parse(body || "{}");
    const identifier = String(raw.identifier || raw.phone || raw.email || "").trim();
    const otp = String(raw.otp || "").trim();
    if (!identifier || !otp) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "identifier and otp are required" }));
    }
    const now = new Date();
    const rec = await prisma.otp.findFirst({
      where: {
        phone: identifier,
        code: otp,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });
    if (!rec) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid or expired OTP" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "OTP verified" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

/**
 * @swagger
 * /auth/forgot-password/reset:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, otp, newPassword, confirmPassword]
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Validation/OTP failure
 */
export const resetPasswordWithOtp = async (req, res, body) => {
  try {
    const raw = JSON.parse(body || "{}");
    const identifier = String(raw.identifier || raw.phone || raw.email || "").trim();
    const otp = String(raw.otp || "").trim();
    const newPassword = String(raw.newPassword || "");
    const confirmPassword = String(raw.confirmPassword || "");
    if (!identifier || !otp || !newPassword || !confirmPassword) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "identifier, otp, newPassword and confirmPassword are required" }));
    }
    if (newPassword !== confirmPassword) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Password confirmation does not match" }));
    }
    if (newPassword.length < 6) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Password must be at least 6 characters" }));
    }

    const now = new Date();
    const rec = await prisma.otp.findFirst({
      where: {
        phone: identifier,
        code: otp,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });
    if (!rec) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid or expired OTP" }));
    }
    let user;
    try {
      user = await prisma.user.findFirst({
        where: { OR: [{ phone: identifier }, { email: identifier.toLowerCase() }] },
      });
    } catch (e) {
      if (!isMissingIsActiveColumnError(e)) throw e;
      const rows = await prisma.$queryRawUnsafe(
        "SELECT `id`,`email`,`phone` FROM `user` WHERE `phone` = ? OR `email` = ? LIMIT 1",
        identifier,
        identifier.toLowerCase(),
      );
      user = Array.isArray(rows) && rows[0] ? rows[0] : null;
    }
    if (!user) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "User not found" }));
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    } catch (e) {
      if (!isMissingIsActiveColumnError(e)) throw e;
      await prisma.$executeRawUnsafe(
        "UPDATE `user` SET `password` = ? WHERE `id` = ?",
        hashed,
        user.id,
      );
    }
    await prisma.otp.update({ where: { id: rec.id }, data: { used: true } });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Password reset successful" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete current user account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [soft, hard]
 *           default: soft
 *         description: soft = disable account, hard = permanent delete
 *     responses:
 *       200:
 *         description: Account deleted or deactivated successfully
 *       401:
 *         description: Missing/invalid token
 */
export const deleteCurrentAccount = async (req, res) => {
  try {
    let authUser;
    try {
      authUser = authenticate(req);
    } catch (err) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Unauthorized" }));
    }

    const userId = String(authUser?.id || "").trim();
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    const rawMode = String(req?.query?.mode || "").toLowerCase();
    const mode = rawMode === "hard" ? "hard" : "soft";

    if (mode === "hard") {
      await prisma.user.delete({ where: { id: userId } });
      await writeAudit(userId, "ACCOUNT_DELETED", { mode: "hard" });
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Account deleted permanently", mode }));
    }

    // Soft delete: disable account without removing rows.
    try {
      await prisma.$executeRawUnsafe(
        "UPDATE `user` SET `isBlocked` = 1, `isActive` = 0, `isDeleted` = 1, `deletedAt` = NOW() WHERE `id` = ?",
        userId,
      );
    } catch (_) {
      await prisma.$executeRawUnsafe(
        "UPDATE `user` SET `isBlocked` = 1 WHERE `id` = ?",
        userId,
      );
    }

    await writeAudit(userId, "ACCOUNT_DELETED", { mode: "soft" });
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Account deactivated", mode }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

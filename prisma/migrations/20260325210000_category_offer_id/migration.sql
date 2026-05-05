-- ربط اختياري بين القسم والعرض (مفتاح أجنبي يُنشئ فهرساً على offerId)
ALTER TABLE `category` ADD COLUMN `offerId` VARCHAR(191) NULL;
-- ملاحظة: بعض قواعد البيانات القديمة لديها `offer.id` كـ INT بينما `offerId` هنا VARCHAR،
-- مما يسبب خطأ MySQL 3780 عند إنشاء الـ FK. لذلك نترك العمود بدون FK للحفاظ على التوافق.

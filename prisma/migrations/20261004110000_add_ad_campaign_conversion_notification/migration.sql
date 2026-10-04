ALTER TABLE "AdCampaign"
  ADD COLUMN "firstAttributedSaleNotifiedAt" TIMESTAMP(3);

UPDATE "AdCampaign" AS campaign
SET "firstAttributedSaleNotifiedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "OrderItem" AS item
  INNER JOIN "Order" AS customer_order ON customer_order."id" = item."orderId"
  INNER JOIN "Payment" AS payment ON payment."orderId" = customer_order."id"
  WHERE item."adCampaignId" = campaign."id"
    AND item."attributedQuantity" > 0
    AND payment."status" = 'SUCCESS'
    AND payment."verifiedAt" IS NOT NULL
);

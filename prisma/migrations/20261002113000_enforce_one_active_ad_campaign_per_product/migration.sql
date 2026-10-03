-- A product can have one current featured placement. Historical campaigns remain intact.
CREATE UNIQUE INDEX "AdCampaign_one_active_per_product"
ON "AdCampaign"("productId")
WHERE "status" = 'ACTIVE';

-- Store the provider checkout URL separately from customer-order payments.
ALTER TABLE "AdCampaign" ADD COLUMN "authorizationUrl" TEXT;

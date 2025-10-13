-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(256) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "admin_uuid" VARCHAR(64) NOT NULL,
    "admin_login_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(256),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apartment" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(45) NOT NULL,
    "province_id" VARCHAR(256),
    "district_id" VARCHAR(256),
    "ward_id" VARCHAR(256),
    "address" VARCHAR(256),

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApartmentRoom" (
    "id" SERIAL NOT NULL,
    "apartment_id" INTEGER NOT NULL,
    "room_number" VARCHAR(45) NOT NULL,
    "default_price" BIGINT NOT NULL,
    "max_tenant" INTEGER,

    CONSTRAINT "ApartmentRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(45) NOT NULL,
    "tel" VARCHAR(45),
    "identity_card_number" VARCHAR(45),
    "email" VARCHAR(256),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantContract" (
    "id" SERIAL NOT NULL,
    "apartment_room_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "pay_period" INTEGER,
    "price" BIGINT NOT NULL,
    "electricity_pay_type_id" INTEGER,
    "electricity_price" BIGINT,
    "electricity_num_start" INTEGER,
    "water_pay_type_id" INTEGER,
    "water_price" BIGINT,
    "water_number_start" INTEGER,
    "number_of_tenant_current" INTEGER,
    "note" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),

    CONSTRAINT "TenantContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCost" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(45) NOT NULL,

    CONSTRAINT "MonthlyCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractMonthlyCost" (
    "id" SERIAL NOT NULL,
    "tenant_contract_id" INTEGER NOT NULL,
    "monthly_cost_id" INTEGER NOT NULL,
    "pay_type" INTEGER,
    "price" BIGINT NOT NULL,

    CONSTRAINT "ContractMonthlyCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityUsage" (
    "id" SERIAL NOT NULL,
    "apartment_room_id" INTEGER NOT NULL,
    "usage_number" INTEGER NOT NULL,
    "input_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterUsage" (
    "id" SERIAL NOT NULL,
    "apartment_room_id" INTEGER NOT NULL,
    "usage_number" INTEGER NOT NULL,
    "input_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFeeCollection" (
    "id" SERIAL NOT NULL,
    "tenant_contract_id" INTEGER NOT NULL,
    "apartment_room_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "electricity_num_before" INTEGER,
    "electricity_num_after" INTEGER,
    "water_number_before" INTEGER,
    "water_number_after" INTEGER,
    "charge_date" TIMESTAMP(3),
    "total_debt" BIGINT,
    "total_price" BIGINT,
    "total_paid" BIGINT,
    "fee_collection_uuid" VARCHAR(64),

    CONSTRAINT "RoomFeeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFeeCollectionHistory" (
    "id" SERIAL NOT NULL,
    "room_fee_collection_id" INTEGER NOT NULL,
    "paid_date" TIMESTAMP(3) NOT NULL,
    "price" BIGINT NOT NULL,

    CONSTRAINT "RoomFeeCollectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prefecture" (
    "id" SERIAL NOT NULL,
    "ward_id" VARCHAR(256),
    "ward_name" VARCHAR(256),
    "ward_name_en" VARCHAR(256),
    "ward_level" VARCHAR(256),
    "district_id" VARCHAR(256),
    "district_name" VARCHAR(256),
    "province_id" VARCHAR(256),
    "province_name" VARCHAR(256),

    CONSTRAINT "Prefecture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_admin_uuid_key" ON "Admin"("admin_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_admin_login_id_key" ON "Admin"("admin_login_id");

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentRoom" ADD CONSTRAINT "ApartmentRoom_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantContract" ADD CONSTRAINT "TenantContract_apartment_room_id_fkey" FOREIGN KEY ("apartment_room_id") REFERENCES "ApartmentRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantContract" ADD CONSTRAINT "TenantContract_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractMonthlyCost" ADD CONSTRAINT "ContractMonthlyCost_tenant_contract_id_fkey" FOREIGN KEY ("tenant_contract_id") REFERENCES "TenantContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractMonthlyCost" ADD CONSTRAINT "ContractMonthlyCost_monthly_cost_id_fkey" FOREIGN KEY ("monthly_cost_id") REFERENCES "MonthlyCost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityUsage" ADD CONSTRAINT "ElectricityUsage_apartment_room_id_fkey" FOREIGN KEY ("apartment_room_id") REFERENCES "ApartmentRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterUsage" ADD CONSTRAINT "WaterUsage_apartment_room_id_fkey" FOREIGN KEY ("apartment_room_id") REFERENCES "ApartmentRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeeCollection" ADD CONSTRAINT "RoomFeeCollection_tenant_contract_id_fkey" FOREIGN KEY ("tenant_contract_id") REFERENCES "TenantContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeeCollection" ADD CONSTRAINT "RoomFeeCollection_apartment_room_id_fkey" FOREIGN KEY ("apartment_room_id") REFERENCES "ApartmentRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeeCollection" ADD CONSTRAINT "RoomFeeCollection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeeCollectionHistory" ADD CONSTRAINT "RoomFeeCollectionHistory_room_fee_collection_id_fkey" FOREIGN KEY ("room_fee_collection_id") REFERENCES "RoomFeeCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

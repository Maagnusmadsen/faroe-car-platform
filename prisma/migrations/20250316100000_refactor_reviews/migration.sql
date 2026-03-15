-- CreateTable: CarReview (renter reviews car, one per booking)
CREATE TABLE "CarReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CarReview_bookingId_key" ON "CarReview"("bookingId");
CREATE INDEX "CarReview_carId_idx" ON "CarReview"("carId");
CREATE INDEX "CarReview_reviewerId_idx" ON "CarReview"("reviewerId");

-- CreateTable: UserReview (owner reviews renter, one per booking)
CREATE TABLE "UserReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserReview_bookingId_key" ON "UserReview"("bookingId");
CREATE INDEX "UserReview_reviewerId_idx" ON "UserReview"("reviewerId");
CREATE INDEX "UserReview_revieweeId_idx" ON "UserReview"("revieweeId");

-- Migrate: renter reviews -> CarReview (reviewerId = booking.renterId)
INSERT INTO "CarReview" ("id", "bookingId", "reviewerId", "carId", "rating", "comment", "createdAt")
SELECT r."id", r."bookingId", r."reviewerId", r."carId", r."rating", r."body", r."createdAt"
FROM "Review" r
INNER JOIN "Booking" b ON b."id" = r."bookingId"
WHERE r."reviewerId" = b."renterId";

-- Migrate: owner reviews -> UserReview (reviewerId = car.ownerId, revieweeId = renterId)
INSERT INTO "UserReview" ("id", "bookingId", "reviewerId", "revieweeId", "rating", "comment", "createdAt")
SELECT r."id", r."bookingId", r."reviewerId", r."revieweeId", r."rating", r."body", r."createdAt"
FROM "Review" r
INNER JOIN "Booking" b ON b."id" = r."bookingId"
INNER JOIN "CarListing" c ON c."id" = b."carId"
WHERE r."reviewerId" = c."ownerId";

-- Add FKs (tables and indexes already exist)
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_carId_fkey" FOREIGN KEY ("carId") REFERENCES "CarListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old review tables (ReviewResponse first due to FK)
DROP TABLE "ReviewResponse";
DROP TABLE "Review";

-- Recompute CarListing.ratingAvg and reviewCount from CarReview
UPDATE "CarListing" c
SET
  "ratingAvg" = sub.avg_rating,
  "reviewCount" = sub.cnt
FROM (
  SELECT "carId", AVG(rating)::numeric(10,2) AS avg_rating, COUNT(*)::integer AS cnt
  FROM "CarReview"
  GROUP BY "carId"
) sub
WHERE c."id" = sub."carId";

-- Clear rating for cars with no car reviews
UPDATE "CarListing"
SET "ratingAvg" = NULL, "reviewCount" = 0
WHERE "id" NOT IN (SELECT "carId" FROM "CarReview");

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toVehicleDto } from "../lib/dto.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

const vehicleSchema = z.object({
  make: z.string().trim().min(1, "Enter the make."),
  model: z.string().trim().min(1, "Enter the model."),
  color: z.string().trim().default(""),
  licensePlate: z.string().trim().min(1, "Enter the license plate."),
  plateRegion: z.string().trim().min(1, "Enter the state or jurisdiction."),
  size: z.enum(["compact", "standard", "large", "oversized"]),
});

vehiclesRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(vehicles.map(toVehicleDto));
  }),
);

vehiclesRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the vehicle details and try again.");

    const existingCount = await prisma.vehicle.count({ where: { userId: req.user!.id } });
    const vehicle = await prisma.vehicle.create({
      data: {
        ...parsed.data,
        licensePlate: parsed.data.licensePlate.toUpperCase(),
        plateRegion: parsed.data.plateRegion.toUpperCase(),
        userId: req.user!.id,
        isDefault: existingCount === 0,
      },
    });
    res.status(201).json(toVehicleDto(vehicle));
  }),
);

async function ownedVehicle(userId: string, id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw notFound("That vehicle no longer exists.");
  if (vehicle.userId !== userId) throw forbidden();
  return vehicle;
}

vehiclesRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    await ownedVehicle(req.user!.id, req.params.id!);
    const parsed = vehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the vehicle details and try again.");

    const data = { ...parsed.data };
    if (data.licensePlate) data.licensePlate = data.licensePlate.toUpperCase();
    if (data.plateRegion) data.plateRegion = data.plateRegion.toUpperCase();

    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data });
    res.json(toVehicleDto(vehicle));
  }),
);

vehiclesRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await ownedVehicle(req.user!.id, req.params.id!);
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json(null);
  }),
);

vehiclesRouter.post(
  "/:id/default",
  asyncRoute(async (req, res) => {
    await ownedVehicle(req.user!.id, req.params.id!);
    await prisma.$transaction([
      prisma.vehicle.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } }),
      prisma.vehicle.update({ where: { id: req.params.id }, data: { isDefault: true } }),
    ]);
    res.json(null);
  }),
);

import { Router } from "express";
import authRoutes from "./authRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import employeeRoutes from "./employeeRoutes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok", service: "AssetFlow API" }));

router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/categories", categoryRoutes);
router.use("/employees", employeeRoutes);

export default router;

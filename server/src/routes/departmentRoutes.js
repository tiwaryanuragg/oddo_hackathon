import { Router } from "express";
import {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from "../controllers/departmentController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// Read: any authenticated user
router.get("/", listDepartments);
router.get("/:id", getDepartment);

// Write: Admin only (Organization Setup)
router.post("/", authorize("Admin"), createDepartment);
router.patch("/:id", authorize("Admin"), updateDepartment);
router.delete("/:id", authorize("Admin"), deactivateDepartment);

export default router;

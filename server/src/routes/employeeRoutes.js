import { Router } from "express";
import {
  listEmployees,
  getEmployee,
  updateEmployeeRole,
  updateEmployeeDepartment,
  updateEmployeeStatus,
} from "../controllers/employeeController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Entire Employee Directory is Admin-only.
router.use(authenticate, authorize("Admin"));

router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.patch("/:id/role", updateEmployeeRole);
router.patch("/:id/department", updateEmployeeDepartment);
router.patch("/:id/status", updateEmployeeStatus);

export default router;

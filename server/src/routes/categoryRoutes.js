import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", listCategories);
router.get("/:id", getCategory);

// Admin-managed asset categories
router.post("/", authorize("Admin"), createCategory);
router.patch("/:id", authorize("Admin"), updateCategory);
router.delete("/:id", authorize("Admin"), deleteCategory);

export default router;

import { Router } from "express";
import { testService } from "../services/testRoutes-service";

const router: Router = Router();

router.get(
  "/test-route",
  testService
);

export default router;
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushRouter from "./push";
import authRouter from "./auth";
import bookingsRouter from "./bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pushRouter);
router.use("/api", bookingsRouter);

export default router;

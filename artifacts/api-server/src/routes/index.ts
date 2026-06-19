import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushRouter from "./push";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import ticketsRouter from "./tickets";
import refundsRouter from "./refunds";
import analyticsRouter from "./analytics";
import dispatchRouter from "./dispatch";
import pricingRouter from "./pricing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pushRouter);
router.use("/api", bookingsRouter);
router.use("/api", ticketsRouter);
router.use("/api", refundsRouter);
router.use(analyticsRouter);
router.use(dispatchRouter);
router.use(pricingRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { ordersRouter } from "./orders";
import { logsRouter } from "./logs";
import { credentialsRouter } from "./credentials";
import { statsRouter } from "./stats";
import { marketRouter } from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/orders", ordersRouter);
router.use("/logs", logsRouter);
router.use("/credentials", credentialsRouter);
router.use("/stats", statsRouter);
router.use("/market", marketRouter);

export default router;

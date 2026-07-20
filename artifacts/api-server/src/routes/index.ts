import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { ordersRouter } from "./orders";
import { logsRouter } from "./logs";
import { credentialsRouter } from "./credentials";
import { statsRouter } from "./stats";
import { marketRouter } from "./market";
import { analyticsRouter } from "./analytics";
import { alertsRouter } from "./alerts";
import { journalRouter } from "./journal";
import { strategiesRouter } from "./strategies";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/orders", ordersRouter);
router.use("/logs", logsRouter);
router.use("/credentials", credentialsRouter);
router.use("/stats", statsRouter);
router.use("/market", marketRouter);
router.use("/analytics", analyticsRouter);
router.use("/alerts", alertsRouter);
router.use("/journal", journalRouter);
router.use("/strategies", strategiesRouter);
router.use(seedRouter);

export default router;

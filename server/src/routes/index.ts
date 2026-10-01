import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { ideaRouter } from "./ideaRoutes.js";
import { searchRouter } from "./searchRoutes.js";
import { repositoryRouter } from "./repositoryRoutes.js";
import { analysisRouter } from "./analysisRoutes.js";
import { adminRouter } from "./adminRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/ideas", ideaRouter);
apiRouter.use("/ideas", searchRouter);
apiRouter.use("/repositories", repositoryRouter);
apiRouter.use("/analyses", analysisRouter);
apiRouter.use("/admin", adminRouter);


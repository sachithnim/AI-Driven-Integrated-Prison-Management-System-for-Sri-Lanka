import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/homeLayout/HomeLayout";
import Dashboard from "../layouts/dashboard/Dashboard";
import SignIn from "../layouts/signin/SignIn";
import Camera from "../layouts/camera/Camera";
import Overcrowding from "../layouts/overcrowding/Overcrowding";
import Rehabilitation from "../layouts/rehabilitation/Rehabilitation";
import Inmates from "../layouts/inmates/Inmates";
import Cells from "../layouts/cells/Cells";
import RehabInmates from "../layouts/rehabilitation/RehabInmates";
import Violations from "../layouts/violations/Violations";
import RehabProgress from "../layouts/rehabilitation/RehabProgress";
import RehabPredictions from "../layouts/rehabilitation/RehabPredictions";
import HomeLeave from "../layouts/rehabilitation/HomeLeave";
import InmateMapView from "../layouts/rehabilitation/InmateMapView";
import InmateDetail from "../layouts/inmates/InmateDetail";


export const router = createBrowserRouter([
    {
        path: "/",
        element: <HomeLayout />,
        children: [
            {
                index: true,
                element: <Dashboard />
            },
            {
                path: "/camera",
                element: <Camera />
            },
            {
                path: "/overcrowding",
                element: <Overcrowding />
            },
            {
                path: "/rehabilitation",
                children: [
                    {
                        index: true,
                        element: <Rehabilitation />,
                    },
                    {
                        path: "rehab-inmates",
                        element: <RehabInmates />
                    },
                    {
                        path: "progress",
                        element: <RehabProgress />
                    },
                    {
                        path: "predictions",
                        element: <RehabPredictions />
                    },
                ]
            },
            {
                path: "/home-leave",
                children: [
                    {
                        index: true,
                        element: <HomeLeave />
                    },
                    {
                        path: "map",
                        element: <InmateMapView />
                    },
                ]
            },
            {
                path: "/inmates",
                children: [
                    {
                        index: true,
                        element: <Inmates />
                    },
                    {
                        path: ":id",
                        element: <InmateDetail />
                    }
                ]
            },
            {
                path: "/cells",
                element: <Cells />
            },
            {
                path: "/violations",
                element: <Violations />
            },
        ]
    },
    {
        path: "/sign-in",
        element: <SignIn />
    },
])
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
                ]
            },
            {
                path: "/inmates",
                element: <Inmates />
            },
            {
                path: "/cells",
                element: <Cells />
            },
        ]
    },
    {
        path: "/sign-in",
        element: <SignIn />
    },
])
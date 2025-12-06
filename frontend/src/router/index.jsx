import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/homeLayout/HomeLayout";
import Dashboard from "../layouts/dashboard/Dashboard";
import SignIn from "../layouts/signin/SignIn";
import Camera from "../layouts/camera/Camera";


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
            }
        ]
    },
    {
        path: "/sign-in",
        element: <SignIn />
    },
])
import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/homeLayout/HomeLayout";
import Dashboard from "../layouts/dashboard/Dashboard";
import SignIn from "../layouts/signin/SignIn";
import CameraManagement from "../layouts/camera/CameraManagement";
import CCTVGrid from "../layouts/camera/CCTVGrid";
import Overcrowding from "../layouts/overcrowding/Overcrowding";
import Rehabilitation from "../layouts/rehabilitation/Rehabilitation";
import Inmates from "../layouts/inmates/Inmates";
import Cells from "../layouts/cells/Cells";
import Prisons from "../layouts/prisons/Prisons";
import RehabInmates from "../layouts/rehabilitation/RehabInmates";
import Violations from "../layouts/violations/Violations";
import RehabProgress from "../layouts/rehabilitation/RehabProgress";
import RehabPredictions from "../layouts/rehabilitation/RehabPredictions";
import HomeLeave from "../layouts/rehabilitation/HomeLeave";
import InmateMapView from "../layouts/rehabilitation/InmateMapView";
import InmateDetail from "../layouts/inmates/InmateDetail";
import Incidents from "../layouts/violations/Incidents";
import GPSReporter from "../layouts/rehabilitation/GPSReporter";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "/camera",
        children: [
          {
            path: "management",
            element: <CameraManagement />,
          },
          {
            path: "cctv",
            element: <CCTVGrid />,
          },
        ],
      },
      {
        path: "/overcrowding",
        element: <Overcrowding />,
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
            element: <RehabInmates />,
          },
          {
            path: "progress",
            element: <RehabProgress />,
          },
          {
            path: "predictions",
            element: <RehabPredictions />,
          },
        ],
      },
      {
        path: "/home-leave",
        children: [
          {
            index: true,
            element: <HomeLeave />,
          },
          {
            path: "map",
            element: <InmateMapView />,
          },
        ],
      },
      {
        path: "/inmates",
        children: [
          {
            index: true,
            element: <Inmates />,
          },
          {
            path: ":id",
            element: <InmateDetail />,
          },
        ],
      },
      {
        path: "/cells",
        element: <Cells />,
      },
      {
        path: "/violations",
        element: <Violations />,
      },
      {
        path: "/incidents",
        element: <Incidents />,
      },
    ],
  },
  {
    path: "/sign-in",
    element: <SignIn />,
  },
  {
        // Standalone GPS reporter for mobile (no sidebar/layout)
        path: "/gps-reporter/:leaveId",
        element: <GPSReporter />
    },
    {
        path: "/gps-reporter",
        element: <GPSReporter />
    },
    {
      path: "/prisons",
      element: <Prisons />
    },
]);
//             {
//                 index: true,
//                 element: <Dashboard />
//             },
//             {
//                 path: "/camera",
//                 element: <Camera />
//             },
//             {
//                 path: "/overcrowding",
//                 element: <Overcrowding />
//             },
//             {
//                 path: "/rehabilitation",
//                 children: [
//                     {
//                         index: true,
//                         element: <Rehabilitation />,
//                     },
//                     {
//                         path: "rehab-inmates",
//                         element: <RehabInmates />
//                     },
//                     {
//                         path: "progress",
//                         element: <RehabProgress />
//                     },
//                     {
//                         path: "predictions",
//                         element: <RehabPredictions />
//                     },
//                 ]
//             },
//             {
//                 path: "/home-leave",
//                 children: [
//                     {
//                         index: true,
//                         element: <HomeLeave />
//                     },
//                     {
//                         path: "map",
//                         element: <InmateMapView />
//                     },
//                 ]
//             },
//             {
//                 path: "/inmates",
//                 children: [
//                     {
//                         index: true,
//                         element: <Inmates />
//                     },
//                     {
//                         path: ":id",
//                         element: <InmateDetail />
//                     }
//                 ]
//             },
//             {
//                 path: "/cells",
//                 element: <Cells />
//             },
//             {
//                 path: "/prisons",
//                 element: <Prisons />
//             },
//             {
//                 path: "/violations",
//                 element: <Violations />
//             },
//         ]
//     },
//     {
//         path: "/sign-in",
//         element: <SignIn />
//     },
//     {
//         // Standalone GPS reporter for mobile (no sidebar/layout)
//         path: "/gps-reporter/:leaveId",
//         element: <GPSReporter />
//     },
//     {
//         path: "/gps-reporter",
//         element: <GPSReporter />
//     },
// ])

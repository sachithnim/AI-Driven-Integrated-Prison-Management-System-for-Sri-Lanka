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
import RehabInmates from "../layouts/rehabilitation/RehabInmates";
import Violations from "../layouts/violations/Violations";
import RehabProgress from "../layouts/rehabilitation/RehabProgress";
import RehabPredictions from "../layouts/rehabilitation/RehabPredictions";
import HomeLeave from "../layouts/rehabilitation/HomeLeave";
import InmateMapView from "../layouts/rehabilitation/InmateMapView";
import InmateDetail from "../layouts/inmates/InmateDetail";
import Incidents from "../layouts/violations/Incidents";
import SurveyCamera from "../layouts/survey/SurveyCamera";
import SupportDocs from "../layouts/survey/SupportDocs";
import InmatesHistory from "../layouts/wellness/InmatesHistory";
import CommonDocs from "../layouts/wellness/CommonDocs";


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
        path: "/survey",
        children: [
          {
            index: true,
            element: <SurveyCamera/>,
          },
          {
            path: "support-docs",
            element: <SupportDocs />
          },
          {
            path: "history",
            element: <InmatesHistory />
          },
          {
            path: "common-docs",
            element: <CommonDocs />
          },
        ]
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
]);

import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Meetings from './pages/Meetings';
import ClientStatusSettings from './pages/ClientStatusSettings';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';
import WorkStageSettings from './pages/WorkStageSettings';
import Settings from './pages/Settings';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Meetings": Meetings,
    "ClientStatusSettings": ClientStatusSettings,
    "Reports": Reports,
    "Integrations": Integrations,
    "GoogleAuthSuccess": GoogleAuthSuccess,
    "WorkStageSettings": WorkStageSettings,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};
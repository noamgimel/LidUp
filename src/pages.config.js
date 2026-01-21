import ClientStatusSettings from './pages/ClientStatusSettings';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import Meetings from './pages/Meetings';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WorkStageSettings from './pages/WorkStageSettings';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import WorkspaceManagement from './pages/WorkspaceManagement';
import NoAccess from './pages/NoAccess';
import SelectWorkspace from './pages/SelectWorkspace';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClientStatusSettings": ClientStatusSettings,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "GoogleAuthSuccess": GoogleAuthSuccess,
    "Home": Home,
    "Integrations": Integrations,
    "Meetings": Meetings,
    "Reports": Reports,
    "Settings": Settings,
    "WorkStageSettings": WorkStageSettings,
    "MasterAdminDashboard": MasterAdminDashboard,
    "WorkspaceManagement": WorkspaceManagement,
    "NoAccess": NoAccess,
    "SelectWorkspace": SelectWorkspace,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
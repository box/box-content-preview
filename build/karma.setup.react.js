import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

function importAll(r) {
    r.keys().forEach(r);
}

importAll(require.context('../src/lib/viewers/archive/__tests__', true, /-test-react\.js$/));

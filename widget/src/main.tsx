import { render } from 'preact';
import { App } from './App';
import './index.css';

const el = document.getElementById('chess-tee-generator');
if (el) {
    render(<App />, el);
}

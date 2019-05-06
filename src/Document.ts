import DocumentCore from './DocumentCore';

import './modules/annotations';
import './modules/font';
import './modules/form';
import './modules/image';
import './modules/shapes';
import './modules/split_text_to_size';
import './modules/standard_fonts';
import './modules/text';

// Export a Document with the entire built-in feature set
export default class Document extends DocumentCore {}

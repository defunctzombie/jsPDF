import * as fs from 'fs';
import * as path from 'path';

const prefix: string = '/../';

class BinaryResource {
    public static load(url): string {
        try {
            return fs.readFileSync(path.resolve(path.join(__dirname, prefix, url)), {
                encoding: 'latin1',
            });
        } catch (ex) {
            console.log(ex);
        }
        return '';
    }

    public static write(url, data) {
        fs.writeFileSync(path.resolve(path.join(__dirname, prefix, url)), data, {
            encoding: 'latin1',
        });
    }
}

export default BinaryResource;

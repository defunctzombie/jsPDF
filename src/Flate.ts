import * as adler32cs from '@vendor/adler32cs';
import * as Deflater from '@vendor/deflater';

function appendBuffer(buffer1, buffer2) {
    const combinedBuffer = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    combinedBuffer.set(new Uint8Array(buffer1), 0);
    combinedBuffer.set(new Uint8Array(buffer2), buffer1.byteLength);
    return combinedBuffer;
}

function Encode(data) {
    const arr = Array(data.length);
    let i = data.length;
    let adler32;
    let deflater;

    while (i--) {
        arr[i] = data.charCodeAt(i);
    }
    adler32 = adler32cs.from(data);
    deflater = new Deflater(6);
    data = deflater.append(new Uint8Array(arr));
    data = appendBuffer(data, deflater.flush());
    const framed = new Uint8Array(data.byteLength + 6);
    framed.set(new Uint8Array([120, 156]));
    framed.set(data, 2);
    framed.set(
        new Uint8Array([
            adler32 & 0xff,
            (adler32 >> 8) & 0xff,
            (adler32 >> 16) & 0xff,
            (adler32 >> 24) & 0xff,
        ]),
        data.byteLength + 2
    );
    data = framed.reduce(function(data, byte) {
        return data + String.fromCharCode(byte);
    }, '');
    return data;
}

export { Encode };

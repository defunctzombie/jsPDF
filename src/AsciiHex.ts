const Encode = function(value) {
    return (
        value
            .split('')
            .map(function(value) {
                return ('0' + value.charCodeAt().toString(16)).slice(-2);
            })
            .join('') + '>'
    );
};

const Decode = function(value) {
    const regexCheckIfHex = new RegExp(/^([0-9A-Fa-f]{2})+$/);
    value = value.replace(/\s/g, '');
    if (value.indexOf('>') !== -1) {
        value = value.substr(0, value.indexOf('>'));
    }
    if (value.length % 2) {
        value += '0';
    }
    if (regexCheckIfHex.test(value) === false) {
        return '';
    }
    let result = '';
    for (let i = 0; i < value.length; i += 2) {
        result += String.fromCharCode(+('0x' + (value[i] + value[i + 1])));
    }
    return result;
};

export { Encode, Decode };

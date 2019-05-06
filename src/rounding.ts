function roundToPrecision(number: number, parmPrecision) {
    const tmpPrecision = parmPrecision;
    if (isNaN(number) || isNaN(tmpPrecision)) {
        throw new Error('Invalid argument passed to jsPDF.roundToPrecision');
    }
    if (tmpPrecision >= 16) {
        return number.toFixed(tmpPrecision).replace(/0+$/, '');
    }
    return number.toFixed(tmpPrecision);
}

function f2(number: number) {
    if (isNaN(number)) {
        throw new Error('Invalid argument passed to jsPDF.f2');
    }
    return roundToPrecision(number, 2);
}

function f3(number: number) {
    if (isNaN(number)) {
        throw new Error('Invalid argument passed to jsPDF.f3');
    }
    return roundToPrecision(number, 3);
}

function hpf(number: number) {
    return roundToPrecision(number, 16);
}

export { roundToPrecision, f2, f3, hpf };

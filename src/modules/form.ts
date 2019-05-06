import DocumentCore from '../DocumentCore';

declare module '../DocumentCore' {
    interface DocumentCore {
        beginFormObject(x, y, width, height, matrix): void;
        endFormObject(key): void;
        doFormObject(key, matrix): void;
        getFormObject(key): void;
    }
}

/**
 * Starts a new pdf form object, which means that all consequent draw calls target a new independent object
 * until {@link endFormObject} is called. The created object can be referenced and drawn later using
 * {@link doFormObject}. Nested form objects are possible.
 * x, y, width, height set the bounding box that is used to clip the content.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Matrix} matrix The matrix that will be applied to convert the form objects coordinate system to
 * the parent's.
 * @function
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name beginFormObject
 */
DocumentCore.prototype.beginFormObject = function(this: DocumentCore, x, y, width, height, matrix) {
    // The user can set the output target to a new form object. Nested form objects are possible.
    // Currently, they use the resource dictionary of the surrounding stream. This should be changed, as
    // the PDF-Spec states:
    // "In PDF 1.2 and later versions, form XObjects may be independent of the content streams in which
    // they appear, and this is strongly recommended although not requiredIn PDF 1.2 and later versions,
    // form XObjects may be independent of the content streams in which they appear, and this is strongly
    // recommended although not required"
    this.beginNewRenderTarget(x, y, width, height, matrix);
    return this;
};

/**
 * Completes and saves the form object.
 * @param {String} key The key by which this form object can be referenced.
 * @function
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name endFormObject
 */
DocumentCore.prototype.endFormObject = function(this: DocumentCore, key) {
    // only add it if it is not already present (the keys provided by the user must be unique!)
    if (this.renderTargetMap[key]) {
        return;
    }

    // save the created xObject
    const newXObject = this.newRenderTarget();

    const xObjectId = 'Xo' + (Object.keys(this.renderTargets).length + 1).toString(10);
    newXObject.id = xObjectId;

    this.renderTargetMap[key] = xObjectId;
    this.renderTargets[xObjectId] = newXObject;

    this.events.publish('addFormObject', newXObject);

    // restore state from stack
    this.restoreRenderTarget();
    return this;
};

/**
 * Draws the specified form object by referencing to the respective pdf XObject created with
 * {@link API.beginFormObject} and {@link endFormObject}.
 * The location is determined by matrix.
 *
 * @param {String} key The key to the form object.
 * @param {Matrix} matrix The matrix applied before drawing the form object.
 * @function
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name doFormObject
 */
DocumentCore.prototype.doFormObject = function(this: DocumentCore, key, matrix) {
    const xObject = this.renderTargets[this.renderTargetMap[key]];
    this.out('q');
    this.out(matrix.toString() + ' cm');
    this.out('/' + xObject.id + ' Do');
    this.out('Q');
    return this;
};

/**
 * Returns the form object specified by key.
 * @param key {String}
 * @returns {{x: number, y: number, width: number, height: number, matrix: Matrix}}
 * @function
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name getFormObject
 */
DocumentCore.prototype.getFormObject = function(this: DocumentCore, key) {
    const xObject = this.renderTargets[this.renderTargetMap[key]];
    return {
        x: xObject.x,
        y: xObject.y,
        width: xObject.width,
        height: xObject.height,
        matrix: xObject.matrix,
    };
};

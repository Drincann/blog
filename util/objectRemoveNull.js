Object.prototype.removeNull = function () {
    for (const key in this) {
        if (!this[key]) {
            delete this[key];
        }
    }
};
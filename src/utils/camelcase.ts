export const camelCase = (obj: any): any => {
    // eslint-disable-next-line eqeqeq
    if (obj == null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(e => camelCase(e));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    return Object.entries(obj).reduce((acc, [key, val]) => {
        const modifiedKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const modifiedVal =
            typeof val === 'object' && val !== null ? camelCase(val) : val;
        return {
            ...acc,
            ...{ [modifiedKey]: modifiedVal },
        };
    }, {});
};

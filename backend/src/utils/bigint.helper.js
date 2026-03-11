const serializeBigInt = (obj) => {

    // recorre el objeto y convierte BigInt a String
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }));
}

module.exports = { serializeBigInt };
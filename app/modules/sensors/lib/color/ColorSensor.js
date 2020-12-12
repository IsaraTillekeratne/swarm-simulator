class ColorSensor {
    /**
     * ColorSensor constructor
     * @param {number} id robot id
     * @param {number[]} values color sensor values
     */
    constructor(id, values) {
        this.id = id;
        if (values !== undefined) {
            this.values = values;
        } else {
            this.values = [0, 0, 0];
        }
        this.updated = new Date();
    }

    /**
     * method for getting color sensor readings
     */
    getReading = () => {
        return {
            id: this.id,
            values: this.values,
            updated: this.updated
        };
    };

    /**
     * method for setting the color sensor data
     * @param {number[]} values color sensor values
     */
    setReading = (values) => {
        this.values = values;
        this.updated = new Date();
    };

    /**
     * method for setting the solor sensor data and get back the updated data
     * @param {number} value color sensor value
     */
    syncReading = (value) => {
        this.value = value;
        this.updated = new Date();

        // TODO: did some process to sync the value with virtual robots
        // Currently just echo back the readings
        return value;
    };
}

module.exports = { ColorSensor };
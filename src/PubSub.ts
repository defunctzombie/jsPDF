/**
 * jsPDF's Internal PubSub Implementation.
 * Backward compatible rewritten on 2014 by
 * Diego Casorran, https://github.com/diegocr
 *
 * @class
 * @name PubSub
 * @ignore
 */
class PubSub {
    private topics = {};
    private context: object;

    constructor(context: object) {
        this.context = context;
    }

    public subscribe(topic, callback, once?: boolean) {
        once = once || false;
        if (
            typeof topic !== 'string' ||
            typeof callback !== 'function' ||
            typeof once !== 'boolean'
        ) {
            throw new Error('Invalid arguments passed to PubSub.subscribe (jsPDF-module)');
        }

        if (!this.topics.hasOwnProperty(topic)) {
            this.topics[topic] = {};
        }

        const token = Math.random().toString(35);
        this.topics[topic][token] = [callback, !!once];

        return token;
    }

    public unsubscribe(token) {
        for (const topic in this.topics) {
            if (this.topics[topic][token]) {
                delete this.topics[topic][token];
                if (Object.keys(this.topics[topic]).length === 0) {
                    delete this.topics[topic];
                }
                return true;
            }
        }
        return false;
    }

    public publish(topic, data?: object) {
        if (this.topics.hasOwnProperty(topic)) {
            const args = Array.prototype.slice.call(arguments, 1);
            const tokens = [];

            for (const token in this.topics[topic]) {
                const sub = this.topics[topic][token];
                try {
                    sub[0].apply(this.context, args);
                } catch (ex) {
                    console.error('jsPDF PubSub Error', ex.message, ex);
                }
                if (sub[1]) {
                    tokens.push(token);
                }
            }
            if (tokens.length) {
                tokens.forEach((token) => {
                    this.unsubscribe(token);
                });
            }
        }
    }

    public getTopics() {
        return this.topics;
    }
}

export default PubSub;

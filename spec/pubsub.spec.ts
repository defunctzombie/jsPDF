import PubSub from '../src/PubSub';

describe('PubSub', () => {
    it('subscribe/subscribe', () => {
        let pubSub;
        let testContext = {};
        let token;
        pubSub = new PubSub(testContext);

        expect(function() {
            pubSub.subscribe('testEvent', function() {}, true);
        }).not.toThrow(new Error('Invalid arguments passed to PubSub.subscribe (jsPDF-module)'));
        expect(function() {
            pubSub.subscribe('testEvent', 'invalid');
        }).toThrow(new Error('Invalid arguments passed to PubSub.subscribe (jsPDF-module)'));
        expect(function() {
            pubSub.subscribe(1, function() {});
        }).toThrow(new Error('Invalid arguments passed to PubSub.subscribe (jsPDF-module)'));
        expect(function() {
            pubSub.subscribe('testEvent', function() {}, 'invalid');
        }).toThrow(new Error('Invalid arguments passed to PubSub.subscribe (jsPDF-module)'));

        expect(typeof pubSub.subscribe('testEvent', function() {}) === 'string').toEqual(true);
        expect(Object.keys(pubSub.getTopics()).length).toEqual(1);

        // check token
        expect(pubSub.subscribe('testEvent', function() {}).length > 0).toEqual(true);

        testContext = {};
        pubSub = new PubSub(testContext);
        pubSub.subscribe('testEvent', function() {});
        expect(Object.keys(pubSub.getTopics()).length).toEqual(1);
        pubSub.subscribe('testEvent', function() {});
        expect(Object.keys(pubSub.getTopics()).length).toEqual(1);

        token = pubSub.subscribe('testEvent2', function() {});
        expect(Object.keys(pubSub.getTopics()).length).toEqual(2);

        pubSub.unsubscribe('invalid');
        expect(Object.keys(pubSub.getTopics()).length).toEqual(2);

        pubSub.unsubscribe(token);
        expect(Object.keys(pubSub.getTopics()).length).toEqual(1);

        token = pubSub.subscribe('testEvent2', function() {});
        expect(Object.keys(pubSub.getTopics()).length).toEqual(2);

        token = pubSub.subscribe('testEvent2', function() {});
        expect(Object.keys(pubSub.getTopics()).length).toEqual(2);

        pubSub.unsubscribe(token);
        expect(Object.keys(pubSub.getTopics()).length).toEqual(2);
    });

    // PubSub-Functionality
    it('PubSub publish', () => {
        interface TestContext {
            success: boolean;
            testFunction(): void;
            malFunction(): void;
        }
        let pubSub;
        let testContext = {
            success: false,
            testFunction() {
                this.success = true;
            },
            malFunction: null,
        };
        let token;
        const originalConsole = console.error;
        let tmpErrorMessage = '';

        console.error = function(value) {
            tmpErrorMessage = value;
        };
        pubSub = new PubSub(testContext);

        token = pubSub.subscribe('testEvent', function(this: TestContext) {
            this.testFunction();
        });
        pubSub.publish('testEvent');
        expect(testContext.success).toEqual(true);
        pubSub.unsubscribe(token);
        testContext.success = false;

        token = pubSub.subscribe('testEvent', function(this: TestContext) {
            this.malFunction();
        });
        pubSub.publish('testEvent');
        expect(tmpErrorMessage).toEqual('jsPDF PubSub Error');
        expect(testContext.success).toEqual(false);
        pubSub.unsubscribe(token);
        testContext.success = false;

        testContext = {
            success: false,
            testFunction() {
                this.success = true;
            },
            malFunction: null,
        };

        token = pubSub.subscribe(
            'testEvent',
            function(this: TestContext) {
                this.testFunction();
            },
            true
        );
        pubSub.publish('testEvent');
        expect(Object.keys(pubSub.getTopics()).length).toEqual(0);

        console.error = originalConsole;
    });
});

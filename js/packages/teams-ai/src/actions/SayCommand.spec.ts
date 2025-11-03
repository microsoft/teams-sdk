import assert from 'assert';
import { Channels } from 'botbuilder';
import * as sinon from 'sinon';

import { sayCommand } from './SayCommand';

describe('actions.sayCommand', () => {
    let sandbox: sinon.SinonSandbox;
    const handler = sayCommand();

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should not send activity when response is empty', async () => {
        const context = {
            activity: { channelId: Channels.Msteams },
            sendActivity: async () => {}
        };

        const stub = sandbox.stub(context, 'sendActivity');

        const res = await handler(context as any, {} as any, {
            type: 'SAY',
            response: undefined as any
        });

        assert.equal(res, '');
        assert.equal(stub.called, false);
    });

    it('should send a message activity', async () => {
        const context = {
            activity: { channelId: Channels.Msteams },
            sendActivity: async (..._args: any[]) => {}
        };
        const stub = sandbox.stub(context, 'sendActivity').callThrough();
        const res = await handler(context as any, {} as any, {
            type: 'SAY',
            response: {
                role: 'assistant',
                content: 'testing123'
            }
        });

        assert.equal(res, '');
        assert(stub.calledOnce);
        assert.equal(
            stub.calledWith({
                type: 'message',
                text: 'testing123',
                channelData: {
                    feedbackLoopEnabled: false
                },
                entities: [
                    {
                        type: 'https://schema.org/Message',
                        '@type': 'Message',
                        '@context': 'https://schema.org',
                        '@id': '',
                        additionalType: ['AIGeneratedContent']
                    }
                ]
            }),
            true
        );
    });

    it('should not send channelData for feedbackLoop if not Teams channel', async () => {
        const context = {
            activity: { channelId: 'not-teams' },
            sendActivity: async (..._args: any[]) => {}
        };

        const stub = sandbox.stub(context, 'sendActivity').callThrough();
        const res = await handler(context as any, {} as any, {
            type: 'SAY',
            response: {
                role: 'assistant',
                content: 'testing123'
            }
        });

        assert.equal(res, '');
        assert.equal(
            stub.calledOnceWith({
                type: 'message',
                text: 'testing123',
                entities: [
                    {
                        type: 'https://schema.org/Message',
                        '@type': 'Message',
                        '@context': 'https://schema.org',
                        '@id': '',
                        additionalType: ['AIGeneratedContent']
                    }
                ]
            }),
            true
        );
    });

    it('should send a message activity and replace newline chars', async () => {
        const context = {
            activity: { channelId: Channels.Msteams },
            sendActivity: async (..._args: any[]) => {}
        };

        const stub = sandbox.stub(context, 'sendActivity').callThrough();
        const res = await handler(context as any, {} as any, {
            type: 'SAY',
            response: {
                role: 'assistant',
                content: '\ntesting123\n'
            }
        });

        assert.equal(res, '');
        assert.equal(
            stub.calledOnceWith({
                type: 'message',
                text: '<br>testing123<br>',
                channelData: {
                    feedbackLoopEnabled: false
                },
                entities: [
                    {
                        type: 'https://schema.org/Message',
                        '@type': 'Message',
                        '@context': 'https://schema.org',
                        '@id': '',
                        additionalType: ['AIGeneratedContent']
                    }
                ]
            }),
            true
        );
    });
    describe('citations', () => {
        it('should send a message activity with citations', async () => {
            const formattedContent = 'testing [1]';
            const context = {
                activity: { channelId: Channels.Msteams },
                sendActivity: async (..._args: any[]) => {}
            };

            const stub = sandbox.stub(context, 'sendActivity').callThrough();
            const citations = [
                {
                    title: 'the title',
                    url: 'http://example.com',
                    filepath: '',
                    content: 'some citation text...'
                }
            ];

            const res = await handler(context as any, {} as any, {
                type: 'SAY',
                response: {
                    role: 'assistant',
                    content: formattedContent,
                    context: {
                        intent: 'my intent',
                        citations
                    }
                }
            });

            assert.equal(res, '');
            assert(
                stub.calledOnceWith({
                    type: 'message',
                    text: formattedContent,
                    channelData: {
                        feedbackLoopEnabled: false
                    },
                    entities: [
                        {
                            type: 'https://schema.org/Message',
                            '@type': 'Message',
                            '@context': 'https://schema.org',
                            '@id': '',
                            additionalType: ['AIGeneratedContent'],
                            citation: [
                                {
                                    '@type': 'Claim',
                                    position: 1,
                                    appearance: {
                                        '@type': 'DigitalDocument',
                                        name: 'the title',
                                        abstract: 'some citation text...',
                                        url: 'http://example.com'
                                    }
                                }
                            ]
                        }
                    ]
                })
            );
        });
    });
});

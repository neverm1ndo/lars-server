export const lines = {
    auth: {
        correct: "1688587991 20230705T231311 <auth/incorrect> Dummy (0) 'Dummy' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
        incorrect: "1688587991 20230705T231311 <auth/incorrect> DummyDummyDummyDum {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
    },
    no_id: {
        cn: '1688587991 20230705T231311 <cn/response> [Dummy]_DummyDummy L1HUXYLPSJNDKA8IQQK8L51UW2L44X',
    },
    kill: {
        weapon: "1688587991 20230705T231311 <any/process> Dummy (1) Dummy2 (0) из 'Silenced 9mm'",
    },
    any_message: {
        with: "1688587991 20230705T231311 <any/process> Dummy (1) 'из Silenced 9mm'"
    }
};
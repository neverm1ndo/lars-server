import { disconnect } from "process";

export const lines = {
    auth: {
        correct: {
            regular: "1688587991 20230705T231311 <auth/correct> Dummy (0) 'Dummy' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
            admin: "1688587991 20230705T231311 <auth/correct/admin> Dummy (0) id:121 'Dummy' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
        },
        incorrect: {
            regular: "1688587991 20230705T231311 <auth/incorrect> DummyDummyDummyDum (0) 'Dummy' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
            no_id:  "1688587991 20230705T231311 <auth/incorrect> DummyDummyDummyDum {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
        }
    },
    disconnect: {
        ban: "1688587991 20230705T231311 <disconnect/ban> Dummy (0) Администратор Admin (2) 'test' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}"
    },
    connect: "1688587991 20230705T231311 <connection/connect> Dummy (0) {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}",
    cn: '1688587991 20230705T231311 <cn/response> [Dummy]_DummyDummy (0) {cn:L1HUXYLPSJNDKA8IQQK8L51UW2L44X}',
    no_id: {
        cn: '1688587991 20230705T231311 <cn/response> [Dummy]_DummyDummy {cn:L1HUXYLPSJNDKA8IQQK8L51UW2L44X}',
    },
    kill: {
        weapon: "1688587991 20230705T231311 <any/process> Dummy (1) Dummy2 (0) из 'Silenced 9mm'",
    },
    any_message: {
        with: "1688587991 20230705T231311 <any/process> Dummy (1) 'из Silenced 9mm'"
    },
    afk: {
        time: [
            "1688587991 20230705T231311 <any/process> Dummy (1) 2 часа, 3 минуты и 34 секунды",
            "1688587991 20230705T231311 <any/process> Dummy (1) 3 минуты и 34 секунды",
            "1688587991 20230705T231311 <any/process> Dummy (1) 34 секунды"
        ]
    },
    dev: {
        tp: "1688587991 20230705T231311 <any/process> Dummy (1) 532.501 -592.966 123.0"
    }
};
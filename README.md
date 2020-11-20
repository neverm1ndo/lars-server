# ![logo](https://raw.githubusercontent.com/neverm1ndo/libertylogs/docs/logo_15ox150.png) LibertyLogs
**LibertyLogs** - программа для чтения логов сервера, записи и изменения конфигурационных файлов игрового сервера.

Документация:

* [Первичная установка](https://github.com/neverm1ndo/libertylogs/blob/master/docs/setup.md)
* [Конфигурация сервера](https://github.com/neverm1ndo/libertylogs/blob/master/docs/configuration.md)

## Стек технологий

Серверная часть:
* TypeScript
* NodeJS
* Express
* MongoDB (Mongoose)
* MySQL (nodejs dep)

Сервер считывает изменения последнего файла в папке с логами и записывает его в базу MongoDB. Это нужно для того, чтобы удобно было искать нужные для админов строки без лишних проходов по текстовым файлам логов и удобной работы с записями, например поиска или фильтрацией.

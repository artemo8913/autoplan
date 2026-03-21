# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...

            // Remove tseslint.configs.recommended and replace with this
            tseslint.configs.recommendedTypeChecked,
            // Alternatively, use this for stricter rules
            tseslint.configs.strictTypeChecked,
            // Optionally, add this for stylistic rules
            tseslint.configs.stylisticTypeChecked,

            // Other configs...
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...
            // Enable lint rules for React
            reactX.configs["recommended-typescript"],
            // Enable lint rules for React DOM
            reactDom.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```

## Вопросы

1. Анкер отдельной сущностью сделать и отрисовывать как отдельный элемент? По идее, анкер неотъемлимая часть анкерной опоры - если опора анкерная, то можно скакзать 100% у неё есть анкер (свойство опоры, если анкерная, то рисовать анкер). С другой стороны, анкер может быть старый, не демонтированный и не подцеплен к опоре (анкер - отдельный элемент, если есть оттяжка, то рисуется линия или две от анкера до опоры). Пока делаю, как свойство опоры
2. `Pole.ts` - все свойства, связанные с анкером вынести в одно поле. Сделать класс `Anchor`. Поля в последствии сделать приватными.
3. Оптимизация перерисовок. Сейчас любой чих приводит к перерисовке всего и вся. Это неприемлимо. Хочется, чтобы менялись непосредственно те элементы, данные которых изменились.

## TODO:

1. Стрелочки зигзагов рисовать соответствующей длиной + заканчивать/начинать с точки на пути
2. Поправить getCatenaryPoses
3. Не совсем нравится такой перебор. Он оптимальный? Есть другой вариант?

```ts
const junction = junctionsStore.list.find((j) => j.section1.id === section.id || j.section2.id === section.id);
```

4. Опора может быть привязана к нескольким путям. Нужно сделать редактировать (менять/добавлять) габарит опоры для каждого из путей
5. Разбить FixingPoint для ВЛ и контактной сети. Сделать общий интерфейс
6. Сделать зигзаги observable, добавить возможность для их изменения
7. Сделать разные варианты отображения для одной выбранной опоры и множества выбранных опор. Соответственно хранить разные данные
8. То, что сейчас в `features` папке скорее должны быть в `widget` слое (но это легко поправить).
9. Сдвоенные опоры. Придумать, что с ними делать
10. Прогнать различные варианты взаимодействия инструментов с SVG. Выписать не очевидные моменты, выписать багули
11. Прочитать, проанализировать и адаптировать код, связанный с инструментами редактирования. Очистить compositionRoot от левого кода
12. Перенастроить конфигурационный файл tsconfig (чтобы работали диаграммы классов)
13. UIStore - разбить этот монолит на различные сервисы по назначению. В хранилище храним только данные, функционал будет в связанных сервисах
14. ToolTypes - вынести BatchCommand в сервис
15. Настроить eslint лучше (чтобы сам правил длиный текст, например)
16. Наверное пока что лучше у новых опор писать наименование "б/н" (что значит без номера). Либо же где-то придумать галочку, мол вариант "б/н" добавлять или же автоматически увеличивать нумерацию опор. Автоматическая нумерация была бы полезна, когда с нуля добавляются опоры. Когда план уже сформирован, максимум, что понадобится, это добавить в существующее расположение новую опору (например рядом с 22 опорой добавить 22а).
17. Убрать инструмент Pan (оставить чисто перемещение на среднюю кнопку мышки) ???
18. При нажатии на enter в поле для ввода хотелось бы переходить к следующему фокумируемому элементу

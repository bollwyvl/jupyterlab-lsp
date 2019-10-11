*** Settings ***
Default Tags      ui:editor
Resource          Keywords.robot

*** Variables ***
${MENU EDITOR}    xpath://div[contains(@class, 'p-Menu-itemLabel')][contains(., "Editor")]
${MENU OPEN WITH}    xpath://div[contains(@class, 'p-Menu-itemLabel')][contains(text(), "Open With")]

*** Test Cases ***
Bash
    Editor Shows Features for Language    Bash    example.sh    Diagnostics

CSS
    Editor Shows Features for Language    CSS    example.css    Diagnostics

Docker
    Editor Shows Features for Language    Docker    Dockerfile    Diagnostics

JS
    Editor Shows Features for Language    JS    example.js    Diagnostics

JSON
    Editor Shows Features for Language    JSON    example.json    Diagnostics

Python
    Editor Shows Features for Language    Python    example.py    Diagnostics

R
    Editor Shows Features for Language    R    example.R    Diagnostics

SCSS
    Editor Shows Features for Language    SCSS    example.scss    Diagnostics

TypeScript
    Editor Shows Features for Language    TypeScript    example.ts    Diagnostics

YAML
    Editor Shows Features for Language    YAML    example.yaml    Diagnostics

*** Keywords ***
Editor Shows Features for Language
    [Arguments]    ${Language}    ${file}    @{features}
    Set Tags    language:${Language.lower()}
    Set Screenshot Directory    ${OUTPUT DIR}${/}screenshots${/}editor${/}${Language.lower()}
    Copy File    ..${/}examples${/}${file}    ${OUTPUT DIR}${/}home${/}${file}
    Reset Application State
    Open ${file} in Editor
    FOR    ${f}    IN    @{features}
        Run Keyword If    "${f}" == "Diagnostics"    Diagnostics Should Be Present
    END
    [Teardown]    Remove File    ${OUTPUT DIR}${/}home${/}${file}

Open ${file} in Editor
    Open Context Menu    css:.jp-DirListing-item[title="${file}"]
    Mouse Over    ${MENU OPEN WITH}
    Wait Until Page Contains Element    ${MENU EDITOR}
    Mouse Over    ${MENU EDITOR}
    Click Element    ${MENU EDITOR}

Diagnostics Should Be Present
    Set Tags    feature:diagnostics
    Wait Until Page Contains Element    css:.cm-lsp-diagnostic    timeout=20s
    Capture Page Screenshot    diagnostics.png

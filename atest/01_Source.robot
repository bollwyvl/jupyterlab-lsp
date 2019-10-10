*** Settings ***
Resource   Keywords.robot

*** Test Cases ***
Check Language Server Features
    [Template]    The ${lang} source file example.${ext} demonstrates features
    Python  py
    R       R

*** Keywords ***
The ${language} source file example.${ext} demonstrates features
    ${file} =  Set Variable   example.${ext}
    Copy File  ..${/}examples${/}${file}  ${OUTPUT DIR}${/}home${/}${file}
    Reset Application State
    Double Click Element  css:.jp-DirListing-item[title="${file}"]
    Wait Until Page Contains Element   css:.cm-lsp-diagnostic  timeout=20s
    Capture Page Screenshot   01-${file}-diagnostic.png
    [Teardown]  Remove File  ${OUTPUT DIR}${/}home${/}${file}

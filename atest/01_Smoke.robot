*** Settings ***
Library   SeleniumLibrary
Suite Setup   Setup
Suite Teardown   Teardown
Test Setup   Reset Application State
Test Teardown   Close JupyterLab
Library   OperatingSystem
Library   Process
Library   String

*** Variables ***
${PORT}  18888
${SPLASH}  id:jupyterlab-splash
${BASE}   /@est/
${URL}  http://localhost:${PORT}${BASE}lab

*** Test Cases ***
Smoke
    Capture Page Screenshot   00-splash.png

*** Keywords ***
Setup
    ${token} =   Generate Random String
    Set Suite Variable   ${TOKEN}   ${token}
    ${home} =  Set Variable  ${OUTPUT DIR}${/}home
    Create Directory   ${home}
    ${app args} =   Set Variable   --no-browser --debug --NotebookApp.base_url\='${BASE}' --port\=${PORT} --NotebookApp.token\='${token}'
    ${path args} =  Set Variable   --LabApp.user_settings_dir='${OUTPUT DIR}${/}settings' --LabApp.workspaces_dir\='${OUTPUT DIR}${/}workspaces'
    Set Screenshot Directory   ${OUTPUT DIR}${/}screenshots
    Start Process  jupyter-lab ${app args} ${path args}  shell=yes  env:HOME=${home}  cwd=${home}
    Open JupyterLab

Teardown
    Close All Browsers
    Terminate All Processes
    Terminate All Processes
    Terminate All Processes  kill=${True}

Wait For Splash
    Wait Until Page Contains Element   ${SPLASH}   timeout=30s
    Wait Until Page Does Not Contain Element   ${SPLASH}

Open JupyterLab
    Open Browser  ${URL}?token=${TOKEN}  browser=headlessfirefox
    Set Window Size  1024  768
    Wait For Splash
    Execute Javascript    window.onbeforeunload \= function (){}

Close JupyterLab
    Close All Browsers

Reset Application State
    Lab Command   Reset Application State
    Wait For Splash

Lab Command
    [Arguments]  ${cmd}
    Press Keys  id:main  CTRL+SHIFT+c
    Input Text  css:.p-CommandPalette-input   ${cmd}
    Click Element  css:.p-CommandPalette-item.p-mod-active

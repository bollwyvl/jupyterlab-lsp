*** Settings ***
Library   SeleniumLibrary
Suite Setup   Setup
Suite Teardown   Teardown
Test Setup   Open JupyterLab
Test Teardown   Close JupyterLab
Library   OperatingSystem
Library   Process
Library   String

*** Variables ***
${PORT}  18888
${SPLASH}  id:jupyterlab-splash
${BASE}   /@est/
${ARGS}   --no-browser --debug --NotebookApp.base_url='${BASE}'
${URL}  http://localhost:${PORT}${BASE}lab

*** Test Cases ***
Smoke
    Capture Page Screenshot   ${OUTPUT DIR}${/}00-splash.png

*** Keywords ***
Setup
    ${token} =   Generate Random String
    Set Suite Variable   ${TOKEN}   ${token}
    Start Process  jupyter-lab --port\=${PORT} --NotebookApp.token\='${token}' ${ARGS}  shell=yes

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
    Wait For Splash
    Execute Javascript    window.onbeforeunload \= function (){}

Close JupyterLab
    Close All Browsers

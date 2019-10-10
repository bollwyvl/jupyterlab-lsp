*** Settings ***
Resource  Variables.robot
Library   SeleniumLibrary
Library   OperatingSystem
Library   Process
Library   String


*** Keywords ***
Setup Server and Browser
    ${token} =   Generate Random String
    Set Suite Variable   ${TOKEN}   ${token}
    ${home} =  Set Variable  ${OUTPUT DIR}${/}home
    Create Directory   ${home}
    ${app args} =   Set Variable   --no-browser --debug --NotebookApp.base_url\='${BASE}' --port\=${PORT} --NotebookApp.token\='${token}'
    ${path args} =  Set Variable   --LabApp.user_settings_dir='${OUTPUT DIR}${/}settings' --LabApp.workspaces_dir\='${OUTPUT DIR}${/}workspaces'
    Set Screenshot Directory   ${OUTPUT DIR}${/}screenshots
    Start Process  jupyter-lab ${app args} ${path args}
    ...  shell=yes
    ...  env:HOME=${home}
    ...  cwd=${home}
    ...  stdout=${OUTPUT DIR}${/}lab.log
    ...  stderr=STDOUT
    Open JupyterLab

Tear Down Everything
    Close All Browsers
    Terminate All Processes
    Terminate All Processes
    Terminate All Processes  kill=${True}

Wait For Splash
    Wait Until Page Contains Element   ${SPLASH}   timeout=30s
    Wait Until Page Does Not Contain Element   ${SPLASH}

Open JupyterLab
    Open Browser  ${URL}?token=${TOKEN}  browser=${BROWSER}
    Set Window Size  1024  768
    Wait For Splash
    Execute Javascript    window.onbeforeunload \= function (){}

Close JupyterLab
    Close All Browsers

Reset Application State
    Lab Command   Reset Application State
    Reload Page
    Wait For Splash

Lab Command
    [Arguments]  ${cmd}
    Press Keys  id:main  CTRL+SHIFT+c
    ${cmd input} =  Set Variable  css:.p-CommandPalette-input
    Wait Until Page Contains Element  ${cmd input}
    Input Text  ${cmd input}   ${cmd}
    ${cmd item} =  Set Variable   css:.p-CommandPalette-item.p-mod-active
    Wait Until Page Contains Element    ${cmd item}
    Click Element  ${cmd item}

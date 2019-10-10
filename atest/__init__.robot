*** Settings ***
Suite Setup   Setup Server and Browser
Suite Teardown   Tear Down Everything
Test Setup   Reset Application State
Test Teardown   Close JupyterLab
Resource  Keywords.robot

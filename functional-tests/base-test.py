import os
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# Setting up saucelabs config
username = os.environ["SAUCE_USERNAME"]
access_key = os.environ["SAUCE_ACCESS_KEY"]
capabilities = {
    'platform': "Mac OS X 10.9",
    'browserName': "chrome",
    'version': "31",
}
capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
hub_url = "%s:%s@localhost:4445" % (username, access_key)
driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="https://%s/wd/hub" % hub_url)


# Tests will be run from here
driver.implicitly_wait(5)
driver.get("http://localhost:8000/functional-tests/index.html")
driver.implicitly_wait(10)
elem = driver.find_element_by_class_name("bp-default-logo")
if (not elem):
    raise Exception("Header not found!")

print driver.title

driver.quit()

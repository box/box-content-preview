#!/bin/bash

npm version | grep preview | sed "s/^.*'\([0-9.]*\)'.*$/\1/"

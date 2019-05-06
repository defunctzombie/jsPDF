global.isNode = true;

afterAll(() => {
    // exit with non 0 when generating PDF files
    if (process.env.JSPDF_GENERATE_SPEC_REFERENCE_FILES) {
        process.exit(1);
    }
});

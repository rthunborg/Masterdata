namespace HrMasterdata.Release
{
    // Compiled only with reviewed Installation constants. Public invocation
    // accepts no target, command, endpoint, source, tool or credential selector.
    internal static class ProtectedProductionIsolationHost
    {
        internal static int Main(string[] args) { return ProtectedProductionIsolationCore.Run(args); }
    }
}

public interface Function extends HasHelp, Serializable {
    Object declare(ArgQueue queue) throws PipeException;

    String name();

    String description();
}
